"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Quicksand } from "next/font/google";

const quicksand = Quicksand({ subsets: ["latin"] });

// 投稿データの型定義
type Post = {
  ID: number;
  image_url: string;
  caption: string;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  // ログイン状態管理
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      // ログイン状態のチェック
      const token = localStorage.getItem("token");
      const savedUsername = localStorage.getItem("username");

      if (token) {
        setIsLoggedIn(true);
        if (savedUsername) setUsername(savedUsername);
      }

      // 投稿データの取得
      try {
        const res = await axios.get("http://localhost:8080/api/posts");
        setPosts(res.data);
      } catch (err) {
        console.error("データの取得に失敗しました", err);
      }
    };

    init();
  }, []); // [] 初回のみ実行される

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("user_id");
    setIsLoggedIn(false);
    setUsername("");
    alert("ログアウトしました");
    router.refresh(); // 画面リフレッシュ
  };

  // 画像ファイルが選択された時の処理
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  // 投稿ボタンが押された時の処理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return alert("画像を選択してください");

    const formData = new FormData();
    formData.append("caption", caption);
    formData.append("image", file);

    try {
      await axios.post("http://localhost:8080/api/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 送信成功後のリセット処理
      setCaption("");
      setFile(null);
      setPreview("");

      // 投稿後にリストを再取得（ここでも axios を直接呼ぶ）
      const res = await axios.get("http://localhost:8080/api/posts");
      setPosts(res.data);

      alert("投稿しました！");
    } catch (err) {
      console.error("投稿エラー", err);
      alert("投稿に失敗しました");
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 pb-20">
      {/* ヘッダー */}
      <nav className="bg-white border-b sticky top-0 z-10 p-4 shadow-sm flex justify-between items-center px-4 md:px-8">
        {/* ロゴ */}
        <h1
          className={`${quicksand.className} text-2xl font-bold text-gray-700`}
        >
          PazooBlogs
        </h1>

        {/* 追加: ログイン状態によるボタンの出し分け */}
        <div className="flex gap-4 text-sm font-bold">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-500 hidden sm:block">
                こんにちは, {username}さん
              </span>
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-700 transition"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <Link
                href="/login"
                className="text-blue-500 hover:text-blue-700 transition"
              >
                ログイン
              </Link>
              <Link
                href="/signup"
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
              >
                登録
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto pt-6 px-4">
        {/* 投稿フォームエリア */}
        {isLoggedIn ? (
          <div className="bg-white p-4 rounded-lg shadow mb-8 border">
            <h2 className="font-bold mb-3 text-gray-700">新規投稿</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {preview && (
                <div className="relative w-full h-48 bg-gray-100 rounded overflow-hidden">
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />

              <textarea
                placeholder="キャプションを書く..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="p-2 border rounded w-full text-black"
                rows={2}
              />

              <button
                type="submit"
                disabled={!file}
                className="bg-blue-500 text-white py-2 rounded font-bold hover:bg-blue-600 disabled:bg-blue-300 transition"
              >
                シェアする
              </button>
            </form>
          </div>
        ) : (
          // ログインしていない時のメッセージエリア
          <div className="bg-white p-6 rounded-lg shadow mb-8 border text-center">
            <h2 className="font-bold text-gray-700 mb-2">
              PazooBlogsへようこそ！
            </h2>
            <p className="text-gray-500 mb-4 text-sm">
              写真や日常をシェアしよう。
            </p>
            <Link
              href="/signup"
              className="inline-block bg-blue-500 text-white font-bold py-2 px-6 rounded-full hover:bg-blue-600 transition"
            >
              はじめる
            </Link>
          </div>
        )}

        {/* タイムライン (投稿リスト) */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div
              key={post.ID}
              className="bg-white border rounded-lg overflow-hidden shadow-sm"
            >
              <div className="p-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <span className="font-bold text-sm text-black">
                  User_{post.ID}
                </span>
              </div>

              {/* 画像部分 */}
              <div className="relative w-full h-96 bg-gray-100">
                <Image
                  src={`http://localhost:8080${post.image_url}`}
                  alt={post.caption}
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
              </div>

              {/* キャプション・アクション部分 */}
              <div className="p-3">
                <div className="flex gap-4 mb-2">
                  <button>❤️</button>
                  <button>💬</button>
                </div>
                <p className="text-sm text-black">
                  <span className="font-bold mr-2">User_{post.ID}</span>
                  {post.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
