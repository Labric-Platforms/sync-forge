import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import logo from '@/assets/logo_light.svg';

export default function Login() {
  const navigate = useNavigate()
  const [code, setCode] = useState("")

  const handleComplete = (value: string) => {
    setCode(value)
    if (value.length === 6) {
      // In a real app, you would validate the code here
      localStorage.setItem("isAuthenticated", "true")
      navigate("/")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-svh p-6 gap-6">
      <div className="flex items-center justify-center gap-3">
        <img src={logo} alt="Labric Sync" className="w-10 h-10" />
        <h1 className="text-2xl font-semibold">Labric Sync</h1>
      </div>
      <div className="w-full max-w-sm flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={handleComplete}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <h2 className="text-md text-muted-foreground mb-4">Enter code from <a href="https://labric.com/enroll" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">labric.com/enroll</a></h2>
    </div>
  )
} 