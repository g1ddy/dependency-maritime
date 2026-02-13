import { ReactFlowProvider } from "@xyflow/react"
import { Header } from "@/components/layout/Header"
import { DependencyGraph } from "@/features/visualization/components/DependencyGraph"
import { GraphOverlay } from "@/features/visualization/components/GraphOverlay"
import { NodeInspectorPanel } from "@/features/visualization/components/NodeInspectorPanel"
import { useGraphStore } from "@/features/visualization/store"
import { DataSourceDialog } from "@/features/visualization/components/DataSourceDialog"
import { SettingsDialog } from "@/features/visualization/components/SettingsDialog"
import { useState } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import { RelationshipPage } from "@/features/relationships"

import { DataSourceDialog as RelationshipDataSourceDialog } from "@/features/relationships/components/DataSourceDialog"

function App() {
  const setGraphData = useGraphStore((state) => state.setGraphData)
  const [isDataSourceOpen, setIsDataSourceOpen] = useState(false)
  const [isRelationshipDataSourceOpen, setIsRelationshipDataSourceOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const location = useLocation();
  const isRelationshipMode = location.pathname === '/relationships';

  const handleOpenDataSource = () => {
    if (isRelationshipMode) {
      setIsRelationshipDataSourceOpen(true);
    } else {
      setIsDataSourceOpen(true);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden text-foreground">
      <Header
        onOpenDataSource={handleOpenDataSource}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentPath={location.pathname}
      />
      <div className="flex-1 relative">
        <Routes>
          <Route path="/" element={
            <ReactFlowProvider>
              <DependencyGraph />
              <GraphOverlay />
              <NodeInspectorPanel />
            </ReactFlowProvider>
          } />
          <Route path="/relationships" element={<RelationshipPage onOpenUpload={() => setIsRelationshipDataSourceOpen(true)} />} />
        </Routes>
      </div>

      {!isRelationshipMode && (
        <DataSourceDialog
          open={isDataSourceOpen}
          onOpenChange={setIsDataSourceOpen}
          onDataLoaded={setGraphData}
        />
      )}

      {isRelationshipMode && (
        <RelationshipDataSourceDialog
          open={isRelationshipDataSourceOpen}
          onOpenChange={setIsRelationshipDataSourceOpen}
        />
      )}

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  )
}

export default App
