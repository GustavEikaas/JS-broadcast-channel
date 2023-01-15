import { useState } from "react";
import styled from "styled-components";
import { newConnector } from "./broadcast/connection";
import { Tile } from "./Tile";

type Move = {
  type: "move";
  index: number;
};

type Start = {
  type: "start";
  name: string;
};

type Commands = Start | Move;

type GameProps = {
  name: string;
};

const s = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export const Game = ({ name }: GameProps) => {
  const [icon, setIcon] = useState<"X" | "O">("X");
  const [myTurn, setMyTurn] = useState(true);

  const [opponentMoves, setOpponentMoves] = useState<number[]>([]);
  const [myMoves, setMyMoves] = useState<number[]>([]);

  const [opponentName, setOpponentName] = useState<string | null>(null);

  const [send] = useState(() => {
    const s = newConnector<Commands>({
      handler: (ev) => {
        if (ev.type === "move") {
          setOpponentMoves((s) => [...s, ev.index]);
          setMyTurn(true);
        } else if (ev.type === "start") {
          setOpponentName(ev.name);
        }
      },
      onConnected: () => {
        console.log("Client connected");
        s.send({ type: "start", name: name });
      },
    });
    s.connect();
    return (e: Commands) => s.send(e);
  });

  const checkIsLegalMove = (i: number) =>
    !opponentMoves.includes(i) && !myMoves.includes(i) && myTurn;

  return (
    <StyledGameRoot>
      <div>
        <div>
          <div>
            {name} is playing as: {icon}
          </div>
          <button onClick={() => setIcon("X")}>X</button>
          <button onClick={() => setIcon("O")}>O</button>
        </div>
        {opponentName ? (
          <div>
            <h2>Match found</h2>
            <h2>{myTurn ? "Your turn" : "Not your turn"} </h2>
            {name} vs. {opponentName}
          </div>
        ) : (
          <div>Waiting for opponent....</div>
        )}
        <StyledGrid>
          {s.map((s, i) => (
            <Tile
              key={s}
              legalMove={checkIsLegalMove(i)}
              chosen={icon === "O" ? <>O</> : <>X</>}
              taken={icon === "O" ? <>X</> : <>O</>}
              onClick={() => {
                if (!checkIsLegalMove(i)) {
                  console.log("err, not your turn yet");
                  return;
                } else {
                  send({ index: i, type: "move" });
                  setMyMoves((s) => [...s, i]);
                  setMyTurn(false);
                }
              }}
              status={
                myMoves.includes(i)
                  ? "chosen"
                  : opponentMoves.includes(i)
                  ? "taken"
                  : "open"
              }
            />
          ))}
        </StyledGrid>
      </div>
    </StyledGameRoot>
  );
};

const StyledGameRoot = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const StyledGrid = styled.div`
  display: grid;
  gap: "1px";
  grid-template-columns: repeat(3, 1fr);
`;
