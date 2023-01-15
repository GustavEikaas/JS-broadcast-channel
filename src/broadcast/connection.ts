import { handshakeHandler, isHandshakeCommand, Ping, Syn } from "./handshake";

type ConnectionStatus = "disconnected" | "connected" | "connecting";

type State = {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
  channel: BroadcastChannel;
  signal: AbortController;
  abort: () => void;
  recieverId: string | null;
  id: string;
};

type NewConnectorArgs<T> = {
  handler: (ev: T) => void;
  events?: {
    onDisconnected?: VoidFunction;
    onConnected?: VoidFunction;
    onConnecting?: VoidFunction;
  };
};

const sendSyn = (id: string, ch: BroadcastChannel) => {
  const syn: Syn = {
    type: "syn",
    syn: { id },
  };

  ch.postMessage(syn);
};

const sendPing = (id: string, ch: BroadcastChannel) => {
  const ping: Ping = {
    id: id,
    type: "ping",
  };

  ch.postMessage(ping);
};

export const newConnector = <T>({ handler, events }: NewConnectorArgs<T>) => {
  const state = createConnectionState(events ?? {});

  function eventHandler(ev: MessageEvent<any>) {
    console.log("Message recieved", ev.data);

    /**Handle handshakes */
    if (isHandshakeCommand(ev.data) && state.status !== "connected") {
      handshakeHandler({
        ev: ev.data,
        originId: state.id,
        onComplete: (id: string) => {
          state.setStatus("connected");
          state.recieverId = id;
          /** Starts ensuring the connection is kept alive */
          startPingSubRoutine(state);
        },
        post: (s) => state.channel.postMessage(s),
      });

      return;
    }

    /**Handle user messages */
    if (state.status === "connected" && isUserMessage<T>(ev.data)) {
      /** Make sure the message comes from your connected partner */
      console.log("user-message", ev.data, state);
      if (ev.data.id === state.recieverId) {
        handler(ev.data.data);
      }
      return;
    }
  }

  return {
    send: (e: T) => {
      if (state.status !== "connected") {
        throw new Error("Connection not ready yet");
      }
      const msg: UserMessage<T> = {
        data: e,
        type: "user-message",
        id: state.id,
      };
      state.channel.postMessage(msg);
    },
    connect: () => {
      if (state.status === "connected") {
        throw new Error("Already connected");
      }
      state.setStatus("connecting");
      state.channel.addEventListener("message", eventHandler, {
        signal: state.signal.signal,
      });
      sendSyn(state.id, state.channel);
    },
    disconnect: () => {
      console.log("disconnected");
      state.abort();
    },
  };
};

type UserMessage<T> = {
  type: "user-message";
  data: T;
  id: string;
};

type ConnectionEvents = {
  onConnected?: VoidFunction;
  onDisconnected?: VoidFunction;
  onConnecting?: VoidFunction;
};

/** Lifecycle for connection state */
function createConnectionState(config: ConnectionEvents): State {
  const state: State = {
    status: "disconnected",
    channel: new BroadcastChannel("connector"),
    signal: new AbortController(),
    setStatus: (newStatus) => {
      state.status = newStatus;

      switch (newStatus) {
        case "connected":
          config.onConnected && config.onConnected();

        case "connecting":
          config.onConnecting && config.onConnecting();

        case "disconnected":
          config.onDisconnected && config.onDisconnected();
      }
    },
    /** Do not destructure */
    abort: () => {
      state.setStatus("disconnected");
      state.signal.abort();
      state.signal = new AbortController();
      state.recieverId = null;
    },
    id: (Math.random() * 16).toString(),
    recieverId: null,
  };

  return state;
}

function isUserMessage<T>(d: unknown): d is UserMessage<T> {
  return (d as UserMessage<T>).type === "user-message";
}

/**
 * Subroutine for continously sending ping signals to keep the connection alive.
 * Implementation is horrible and unstable due to heavily relying on timers
 */
function startPingSubRoutine(state: State) {
  let skip = 1;

  function handleAbort() {
    state.abort();
    clearInterval(recieverInterval);
  }

  state.channel.addEventListener(
    "message",
    (e) => {
      if (isPingMessage(e.data) && e.data.id === state.recieverId) {
        setTimeout(() => sendPing(state.id, state.channel), 100);
        skip = 1;
      }
    },
    { signal: state.signal.signal }
  );

  sendPing(state.id, state.channel);

  const recieverInterval = setInterval(() => {
    if (skip === 1) {
      skip = 0;
      return;
    } else {
      console.error("Peer disconnected");
      handleAbort();
    }
  }, 5000);
}

function isPingMessage(d: unknown): d is Ping {
  return (d as Ping)?.type === "ping";
}
