import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getEnrollCode } from "@/lib/api";
import logo from "@/assets/logo_light.svg";

interface EnrollmentCode {
  code: string;
  expires_at: string;
}

function getTimeUntil(expiryDate: string): string {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 1) return "less than 1m";
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

export default function Login() {
  const navigate = useNavigate();
  const [enrollmentCode, setEnrollmentCode] = useState<EnrollmentCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrollmentCode = async () => {
      try {
        const deviceInfo = await window.api.getDeviceInfo();
        const response = await getEnrollCode(deviceInfo);
        setEnrollmentCode({
          code: response.enrollCode.code,
          expires_at: response.enrollCode.expires_at,
        });
      } catch (err) {
        setError("Failed to get enrollment code. Please try again later.");
        console.error("Error fetching enrollment code:", err);
      }
    };

    fetchEnrollmentCode();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-svh p-6 gap-6">
      <div className="flex items-center justify-center gap-3">
        <img src={logo} alt="Labric Sync" className="w-10 h-10" />
        <h1 className="text-2xl font-semibold">Labric Sync</h1>
      </div>
      <div className="w-full max-w-sm flex flex-col items-center justify-center gap-4">
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : enrollmentCode ? (
          <>
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex gap-2">
                {enrollmentCode.code.slice(0, 3).split("").map((char, i) => (
                  <span
                    key={i}
                    className="inline-flex w-8 h-10 items-center justify-center border-2 rounded-lg font-mono text-xl"
                  >
                    {char}
                  </span>
                ))}
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
              <span className="inline-flex gap-2">
                {enrollmentCode.code.slice(3).split("").map((char, i) => (
                  <span
                    key={i}
                    className="inline-flex w-8 h-10 items-center justify-center border-2 rounded-lg font-mono text-xl"
                  >
                    {char}
                  </span>
                ))}
              </span>
            </div>
            {/*
            <p className="text-sm text-muted-foreground">
              Expires in {getTimeUntil(enrollmentCode.expires_at)}
            </p>
            */}
          </>
        ) : (
          <div className="text-muted-foreground">Loading enrollment code...</div>
        )}
      </div>
      <h2 className="text-md text-muted-foreground mb-4">
        Enter this code at{" "}
        <a
          href="https://labric.com/enroll"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          labric.com/enroll
        </a>
      </h2>
    </div>
  );
}
