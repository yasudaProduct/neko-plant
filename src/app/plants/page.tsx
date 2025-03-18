import PlantSearch from "@/components/PlantSearch";

export default function Plants() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <PlantSearch />
      </div>
    </div>
  );
}
