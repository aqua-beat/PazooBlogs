"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Quicksand } from "next/font/google";

// フォント設定
const quicksand = Quicksand({ subsets: ["latin"] });

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ログインAPIを叩く
      const res = await axios.post("http://localhost:8080/api/login", {
        username: username,
        password: password,
      });

      // 成功したら、トークンをブラウザ(localStorage)に保存
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("user_id", res.data.user_id);

      alert("ログインしました！");
      router.push("/"); // ホームへ移動
    } catch (err) {
      console.error(err);
      alert("ログインに失敗しました。ユーザー名かパスワードが間違っています。");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white p-8 rounded-lg shadow-md border">
        {/* タイトル */}
        <h1
          className={`${quicksand.className} text-3xl font-bold text-center mb-8 text-gray-700`}
        >
          PazooBlogs
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
            ログイン
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-gray-500">
            アカウントをお持ちでないですか？ <br />
            <Link href="/signup" className="text-blue-500 font-bold">
              登録する
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
