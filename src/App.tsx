import { Header } from "@/components/layout/Header"
import { CanvasPlaceholder } from "@/features/visualization/components/CanvasPlaceholder"
import { GraphOverlay } from "@/features/visualization/components/GraphOverlay"

function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden text-foreground">
      <Header />
      <div className="flex-1 relative">
        <CanvasPlaceholder />
        <GraphOverlay />
      </div>
    </div>
  )
}

export default App
