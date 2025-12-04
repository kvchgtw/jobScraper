import SearchBox from "./components/SearchBox";
import ASCIIHeader from "./components/ASCIIHeader";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <ASCIIHeader />
      <div className="max-w-6xl mx-auto mt-8">
        <SearchBox />
      </div>
    </main>
  );
}
