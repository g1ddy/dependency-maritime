import { ReactFlowProvider } from "@xyflow/react"
import { Header } from "@/components/layout/Header"
import { DependencyGraph } from "@/features/visualization/components/DependencyGraph"
import { GraphOverlay } from "@/features/visualization/components/GraphOverlay"
import { NodeInspectorPanel } from "@/features/visualization/components/NodeInspectorPanel"
import { useGraphStore } from "@/features/visualization/store"
import { DataSourceDialog } from "@/features/visualization/components/DataSourceDialog"
import { useState } from "react"

function App() {
  const setGraphData = useGraphStore((state) => state.setGraphData)
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false)

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden text-foreground">
      <Header onOpenDataSource={() => setIsDataSourceOpen(true)} />
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <DependencyGraph />
          <GraphOverlay />
          <NodeInspectorPanel />
        </ReactFlowProvider>
      </div>
      <DataSourceDialog
        open={isDataSourceOpen}
        onOpenChange={setIsDataSourceOpen}
        onDataLoaded={setGraphData}
      />
    </div>
  )
}

export default App
