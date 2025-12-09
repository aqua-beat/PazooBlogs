"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Quicksand } from "next/font/google";

const quicksand = Quicksand({ subsets: ["latin"] });

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Goサーバーの登録APIを叩く
      await axios.post("http://localhost:8080/api/signup", {
        username: username,
        password: password,
      });

      alert("登録が完了しました！");
      router.push("/"); // ひとまずホームに戻る
    } catch (err) {
      console.error(err);
      alert("登録に失敗しました（ユーザー名が重複している可能性があります）");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white p-8 rounded-lg shadow-md border">
        <h1 className={`${quicksand.className} text-3xl font-bold text-center mb-8 text-gray-700`}>PazooBlogs</h1>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              placeholder="ユーザーネーム"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border rounded bg-gray-50 text-sm outline-none focus:border-gray-400 text-black placeholder-gray-500"
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded bg-gray-50 text-sm outline-none focus:border-gray-400 text-black placeholder-gray-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-bold py-2 rounded hover:bg-blue-600 transition"
          >
            登録する
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-gray-500">
            すでにアカウントをお持ちですか？ <br />
            <Link href="/" className="text-blue-500 font-bold">
              ログイン (準備中)
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
