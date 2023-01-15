import { describe, expect, test } from "@jest/globals";
import {
  Ack,
  Entity,
  handshakeHandler,
  isHandshakeCommand,
  Syn_Ack,
} from "../handshake";

describe("check if is handshake", () => {
  test("should be a true", () => {
    expect(isHandshakeCommand({ type: "syn" })).toBeTruthy();
  });
  test("Should be false", () => {
    expect(isHandshakeCommand({} as any)).toBeFalsy();
  });

  test("handler responds to syn-ack with ack", () => {
    const mockFunction = jest.fn();

    const ack: Entity = {
      id: "125",
    };
    const syn: Entity = {
      id: "123",
    };

    handshakeHandler({
      ev: { type: "syn_ack", ack: ack, syn: syn },
      onComplete: () => void 0,
      originId: "123",
      post: mockFunction,
    });

    const expected: Ack = {
      ack: ack,
      syn: syn,
      type: "ack",
    };
    expect(mockFunction).toBeCalledWith(expected);
  });

  test("handler responds to syn with syn-ack", () => {
    const mockFunction = jest.fn();

    const originId = "123";

    const incomingSyn: Entity = {
      id: "125",
    };
    const outgoingAck: Entity = {
      id: originId,
    };

    handshakeHandler({
      ev: { type: "syn", syn: incomingSyn },
      onComplete: () => void 0,
      originId: originId,
      post: mockFunction,
    });

    const expected: Syn_Ack = {
      ack: outgoingAck,
      syn: incomingSyn,
      type: "syn_ack",
    };
    expect(mockFunction).toBeCalledWith(expected);
  });
});
