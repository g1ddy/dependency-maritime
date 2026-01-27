import { ReactFlowProvider } from "@xyflow/react"
import { Header } from "@/components/layout/Header"
import { DependencyGraph } from "@/features/visualization/components/DependencyGraph"
import { GraphOverlay } from "@/features/visualization/components/GraphOverlay"
import { useGraphStore } from "@/features/visualization/store"

function App() {
  const setGraphData = useGraphStore((state) => state.setGraphData)

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden text-foreground">
      <Header onDataLoaded={setGraphData} />
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <DependencyGraph />
          <GraphOverlay />
        </ReactFlowProvider>
      </div>
    </div>
  )
}

export default App
