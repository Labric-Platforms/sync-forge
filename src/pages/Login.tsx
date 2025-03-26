import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getEnrollCode } from "@/lib/api";
import logo from "@/assets/logo_light.svg";
import { toast } from "sonner";

interface EnrollmentCode {
  code: string;
  expires_at: string;
}

interface CodeDigitProps {
  char: string;
  isLoading?: boolean;
}

const CodeDigit = ({ char, isLoading }: CodeDigitProps) => (
  <span
    className={`inline-flex w-8 h-10 items-center justify-center border-2 rounded-lg font-mono text-xl ${
      isLoading ? "bg-muted-foreground animate-pulse" : ""
    }`}
  >
    {!isLoading && char}
  </span>
);

const CodeDisplay = ({ code, isLoading = false }: { code?: string; isLoading?: boolean }) => {
  const displayCode = code || "000000";
  return (
    <div className="inline-flex items-center gap-2">
      <span className="inline-flex gap-2">
        {displayCode.slice(0, 3).split("").map((char, i) => (
          <CodeDigit key={i} char={char} isLoading={isLoading} />
        ))}
      </span>
      <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
      <span className="inline-flex gap-2">
        {displayCode.slice(3).split("").map((char, i) => (
          <CodeDigit key={i} char={char} isLoading={isLoading} />
        ))}
      </span>
    </div>
  );
};

export default function Login() {
  const navigate = useNavigate();
  const [enrollmentCode, setEnrollmentCode] = useState<EnrollmentCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollmentCode = async () => {
    try {
      const deviceInfo = await window.api.getDeviceInfo();
      const response = await getEnrollCode(deviceInfo);
      const newCode = {
        code: response.enrollCode.code,
        expires_at: response.enrollCode.expires_at,
      };
      setEnrollmentCode(newCode);
      return newCode;
    } catch (err) {
      setError("Failed to get enrollment code. Please try again later.");
      console.error("Error fetching enrollment code:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchEnrollmentCode();
  }, []);

  useEffect(() => {
    if (!enrollmentCode) return;

    const checkExpiration = () => {
      const now = new Date();
      const expiry = new Date(enrollmentCode.expires_at);
      if (now >= expiry) {
        toast.promise(fetchEnrollmentCode(), {
          loading: 'Getting a new enrollment code...',
          success: 'New enrollment code generated',
          error: 'Failed to get new enrollment code',
          duration: 4000,
        });
      }
    };

    const interval = setInterval(checkExpiration, 1000);
    return () => clearInterval(interval);
  }, [enrollmentCode]);

  return (
    <div className="flex flex-col items-center justify-center h-svh p-6 gap-6">
      <div className="flex items-center justify-center gap-3">
        <img src={logo} alt="Labric Sync" className="w-10 h-10" />
        <h1 className="text-2xl font-semibold">Labric Sync</h1>
      </div>
      <div className="w-full max-w-sm flex flex-col items-center justify-center gap-4">
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <CodeDisplay code={enrollmentCode?.code} isLoading={!enrollmentCode} />
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
