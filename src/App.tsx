import { Navbar } from "./components/navbar";
import { Authors } from "./components/authors";

function App() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto space-y-12 py-12 px-4">
        <Authors />
      </div>
    </>
  );
}

export default App;
