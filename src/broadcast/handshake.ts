export type Syn = {
  type: "syn";
  syn: Entity;
};

export type Ping = {
  type: "ping";
  id: string;
};

export type Syn_Ack = {
  type: "syn_ack";
  ack: Entity;
  syn: Entity;
};

export type Ack = {
  type: "ack";
  syn: Entity;
  ack: Entity;
};

function synAck(ack: Entity, syn: Entity): Syn_Ack {
  return {
    type: "syn_ack",
    //self
    syn: syn,
    ack: ack,
  };
}

function ack(syn: Entity, ack: Entity): Ack {
  return {
    type: "ack",
    //Sender
    syn: syn,
    //Reciever
    ack: ack,
  };
}

export type Entity = {
  id: string;
};

export type Handshake = Syn | Syn_Ack | Ack;

type HandlerArgs = {
  ev: Handshake;
  originId: string;
  onComplete: (id: string) => void;
  post: (msg: any) => void;
};

export function handshakeHandler({
  ev,
  onComplete,
  originId,
  post,
}: HandlerArgs) {
  switch (ev.type) {
    case "ack": {
      //I sent syn_ack, ack is me
      if (ev.ack.id === originId) {
        onComplete(ev.syn.id);
        return;
      }
      /**
       * Start going over to ping
       */
      return;
    }

    case "syn_ack": {
      //I sent the syn, i am syn
      if (ev.syn.id === originId) {
        //Return ack before calling onComplete
        post(ack(ev.syn, ev.ack));
        onComplete(ev.ack.id);
      }
      return;
    }

    case "syn": {
      if (ev.syn.id === originId) return;
      /**
       * Syn recieved
       * respond with syn_ack
       */
      post(synAck({ id: originId }, ev.syn));
      return;
    }

    default: {
      throw new Error("Command is not a handshake sequence");
    }
  }
}

type Names = [Syn["type"], Ack["type"], Syn_Ack["type"]];

const validTypes: Names = ["syn", "ack", "syn_ack"];

type Command = {
  type: string;
};

export function isHandshakeCommand(ev: Command): ev is Handshake {
  if (!Object.hasOwn(ev, "type")) return false;
  return (validTypes as string[]).includes(ev.type);
}
