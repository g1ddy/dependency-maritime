import { Header } from "@/components/layout/Header"
import { DependencyGraph } from "@/features/visualization/components/DependencyGraph"
import { GraphOverlay } from "@/features/visualization/components/GraphOverlay"

function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden text-foreground">
      <Header />
      <div className="flex-1 relative">
        <DependencyGraph />
        <GraphOverlay />
      </div>
    </div>
  )
}

export default App
