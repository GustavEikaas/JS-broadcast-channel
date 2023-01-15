import { ReactNode } from 'react';
import styled from 'styled-components'

type TileProps = {
    status: "chosen" | "taken" | "open";
    onClick: () => void;
    chosen: ReactNode;
    taken: ReactNode;
    legalMove: boolean;
}
export function Tile({onClick, status, chosen, taken, legalMove}: TileProps){
    return (
        <StyledTile isLegal={legalMove} onClick={onClick}>
            {status === "chosen" ? <div>{chosen}</div> : status === "taken" ? <div>{taken}</div> : ""}
        </StyledTile>
    )

}

const StyledTile = styled.div<{isLegal: boolean}>`
    border: 2px solid black;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100px;
    width: 100px;
    &:hover{
        background-color: ${({isLegal}) => isLegal ? "lightgray" : "none"};
    }
`