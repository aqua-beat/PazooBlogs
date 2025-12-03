"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function Home() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Goサーバー(8080)からデータを取得
    axios
      .get("http://localhost:8080/")
      .then((res) => setMessage(res.data.message))
      .catch((err) => console.error(err));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">PazooBlogs</h1>
      <p className="text-xl">
        Backend Status:
        <span className="text-green-500 font-bold ml-2">
          {message || "Loading..."}
        </span>
      </p>
    </main>
  );
}
