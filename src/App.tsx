import { useState } from "react";
import "./App.css";
import { Game } from "./Game";

function App() {
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);

  return (
    <div className="App">
      {ready ? (
        <Game name={name} />
      ) : (
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <button onClick={() => setReady(true)}>Ready up</button>
        </div>
      )}
    </div>
  );
}

export default App;
