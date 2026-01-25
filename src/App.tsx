import { Header } from "@/components/layout/Header"
import { CanvasPlaceholder } from "@/components/layout/CanvasPlaceholder"
import { GraphOverlay } from "@/components/layout/GraphOverlay"

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
