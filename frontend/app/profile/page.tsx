"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { Quicksand } from "next/font/google";

const quicksand = Quicksand({ subsets: ["latin"] });

type Post = {
  ID: number;
  image_url: string;
  caption: string;
};

export default function Profile() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [username, setUsername] = useState("User");

  useEffect(() => {
    const init = async () => {
      // ユーザー名の取得と設定
      const savedUsername = localStorage.getItem("username");
      if (savedUsername) {
        setUsername(savedUsername);
      }

      // 自分の投稿データの取得
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await axios.get("http://localhost:8080/api/me/posts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setPosts(res.data);
      } catch (err) {
        console.error("データ取得エラー", err);
      }
    };

    init();
  }, []);

  const handleDelete = async (postId: number, e: React.MouseEvent) => {
    // 親要素へのクリック伝播を止める
    e.stopPropagation();

    if (!confirm("本当にこの投稿を削除しますか？")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:8080/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 画面からも消す
      setPosts(posts.filter((post) => post.ID !== postId));
      alert("削除しました");
    } catch (err) {
      console.error("削除エラー", err);
      alert("削除に失敗しました");
    }
  };

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* ヘッダー */}
      <nav className="bg-white border-b sticky top-0 z-10 p-4 flex justify-between items-center px-4 md:px-8">
        <Link
          href="/"
          className={`${quicksand.className} text-2xl font-bold text-gray-700 hover:opacity-70`}
        >
          PazooBlogs
        </Link>
        <Link
          href="/"
          className="text-sm font-bold text-gray-500 hover:text-blue-500 transition"
        >
          ホームに戻る
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto pt-8 px-4">
        {/* プロフィール情報エリア */}
        <div className="flex flex-col items-center mb-10 border-b pb-8">
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-4"></div>

          <h2 className="text-2xl font-bold text-gray-800">{username}</h2>

          <div className="flex gap-8 mt-4 text-gray-700">
            <div className="text-center">
              <span className="font-bold block text-xl">{posts.length}</span>
              <span className="text-sm">Posts</span>
            </div>
            <div className="text-center">
              <span className="font-bold block text-xl">0</span>
              <span className="text-sm">Followers</span>
            </div>
            <div className="text-center">
              <span className="font-bold block text-xl">0</span>
              <span className="text-sm">Following</span>
            </div>
          </div>
        </div>

        {/* 投稿リスト */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div
              key={post.ID}
              className="bg-white border rounded-lg overflow-hidden shadow-sm relative group"
            >
              {/* 投稿ヘッダー */}
              <div className="p-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <span className="font-bold text-sm text-black">{username}</span>
              </div>

              {/* 画像部分 */}
              <div className="relative w-full h-96 bg-gray-100">
                <Image
                  src={`http://localhost:8080${post.image_url}`}
                  alt={post.caption}
                  fill
                  className="object-cover"
                  unoptimized
                />

                {/* 削除ボタン */}
                <button
                  onClick={(e) => handleDelete(post.ID, e)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                  title="削除する"
                >
                  🗑️
                </button>
              </div>

              {/* キャプション・アクション部分 */}
              <div className="p-3">
                <div className="flex gap-4 mb-2">
                  <button>❤️</button>
                  <button>💬</button>
                </div>
                <p className="text-sm text-black">
                  <span className="font-bold mr-2">{username}</span>
                  {post.caption}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 投稿がない場合 */}
        {posts.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p>まだ投稿がありません</p>
            <Link
              href="/"
              className="text-blue-500 font-bold mt-2 inline-block"
            >
              最初の投稿をする
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
