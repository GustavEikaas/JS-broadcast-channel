import { handshakeHandler, isHandshakeCommand, Syn } from "./handshake";

type State = {
  status: "disconnected" | "connected" | "connecting";
  channel: BroadcastChannel;
  signal: AbortController;
  abort: () => void;
  recieverId: string | null;
  id: string;
};

type NewConnectorArgs<T> = {
  handler: (ev: T) => void;
  onConnected: () => void;
};

const sendSyn = (id: string, ch: BroadcastChannel) => {
  const syn: Syn = {
    type: "syn",
    syn: { id },
  };

  ch.postMessage(syn);
};

export const newConnector = <T>({
  handler,
  onConnected,
}: NewConnectorArgs<T>) => {
  const state = createConnectionState();

  function eventHandler(ev: MessageEvent<any>) {
    console.log("Message recieved", ev.data);

    /**Handle handshakes */
    if (isHandshakeCommand(ev.data) && state.status !== "connected") {
      handshakeHandler({
        ev: ev.data,
        originId: state.id,
        onComplete: (id: string) => {
          console.log("Connection established");
          state.status = "connected";
          state.recieverId = id;
          console.log(state);
          onConnected();
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
      console.log("connecting");
      state.status = "connecting";

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

/** Lifecycle for connection state */
function createConnectionState(): State {
  const state: State = {
    status: "disconnected",
    channel: new BroadcastChannel("connector"),
    signal: new AbortController(),
    /** Do not destructure */
    abort: () => {
      state.status = "disconnected";
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
