import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText } from "lucide-react"

export default function FileDetails() {
  const { path } = useParams()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-svh">
      <div className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">File Details</h1>
      </div>
      
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-muted-foreground" />
            <span className="text-xl font-medium break-all">{path}</span>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg border">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">File Path</h2>
              <p className="text-sm break-all">{path}</p>
            </div>
            
            {/* Add more file details here as needed */}
          </div>
        </div>
      </div>
    </div>
  )
} 