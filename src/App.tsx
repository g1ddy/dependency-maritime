import { ReactFlowProvider } from "@xyflow/react"
import { Header } from "@/components/layout/Header"
import { DependencyGraph } from "@/features/visualization/components/DependencyGraph"
import { GraphOverlay } from "@/features/visualization/components/GraphOverlay"
import { useGraphStore } from "@/features/visualization/store"
import { CruiseResultSchema } from "@/schema/dependency-cruiser"

// Import JSON data directly
// Note: These imports depend on resolveJsonModule in tsconfig
import sampleData from "../sample-data/dependency-graph.json"
import projectData from "../config/dependency-graph.json"

function App() {
  const { setGraphData } = useGraphStore()

  const handleUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as unknown
        const result = CruiseResultSchema.parse(json)
        setGraphData(result)
      } catch (error) {
        // TODO: Integrate with a structured logging solution (e.g., Sentry)
        console.error("Failed to parse or validate file:", error)
        // TODO: Implement a non-blocking notification system (e.g., Toast) to inform the user
      }
    }
    reader.readAsText(file)
  }

  const handleLoadSample = () => {
    try {
      const data = CruiseResultSchema.parse(sampleData)
      setGraphData(data)
    } catch (error) {
      // TODO: Integrate with a structured logging solution
      console.error("Failed to load sample data:", error)
      // TODO: Implement a non-blocking notification system
    }
  }

  const handleLoadProject = () => {
    try {
      const data = CruiseResultSchema.parse(projectData)
      setGraphData(data)
    } catch (error) {
      // TODO: Integrate with a structured logging solution
      console.error("Failed to load project data:", error)
      // TODO: Implement a non-blocking notification system
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden text-foreground">
      <Header
        onUpload={handleUpload}
        onLoadSample={handleLoadSample}
        onLoadProject={handleLoadProject}
      />
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
