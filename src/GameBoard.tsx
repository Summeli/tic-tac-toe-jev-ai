import EndGameView from './EndGameView';
import GameButton from './GameButton';
import { useGameContext } from './GameContext';
import { clearLostGames } from './learning';

const GameBoard: React.FunctionComponent = () => {

  const {board,turn, nextMove, resetGame} = useGameContext();
  let gameStarted: boolean = false; 
  if (!board || !nextMove || !resetGame) return null;
 
  if(turn){
    gameStarted = true;
}
  const forgetLostGames = () => {
    if (window.confirm("Remove all of Jev's lost games and start a new game?")) {
      clearLostGames();
      resetGame();
    }
  };

  const renderGameButton = (row: number, col: number) => {
    let tx : string = board[row][col];
      return (
          <GameButton
            text={tx}
            row = {row} col={col}
          />
        );
  };


  return(
      <div className="gameboard">
        <div className="board-row">
          {renderGameButton(0,0)}
          {renderGameButton(0,1)}
          {renderGameButton(0,2)}
        </div>
      <div className="board-row">
        {renderGameButton(1,0)}
        {renderGameButton(1,1)}
        {renderGameButton(1,2)}
      </div>
      <div className="board-row">
        {renderGameButton(2,0)}
        {renderGameButton(2,1)}
        {renderGameButton(2,2)}
      </div>
      {
       gameStarted ? 
      (<div className="extrabuttoncontainer">
        <button onClick = {resetGame} className= "newGameButton">new Game</button>
        <button onClick = {forgetLostGames} className= "newGameButton">reset Jev's memory</button>
      </div>) :
      <div></div>
      }
      <EndGameView />


  </div>
);

}

export default GameBoard;
