import GenerateEmbeddingsButton from "@/components/GenerateEmbeddingsButton";
import SearchBar from "@/components/SearchBar";
import Chat from "@/components/Chat";
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 gap-4 p-4">
      <GenerateEmbeddingsButton />

      <SearchBar />

      <Chat />
    </div>
  );
}
