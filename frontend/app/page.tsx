"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Quicksand } from "next/font/google";

const quicksand = Quicksand({ subsets: ["latin"] });

// コメントの型定義
type Comment = {
  id: number;
  username: string;
  text: string;
};

// 投稿データの型定義
type Post = {
  ID: number;
  image_url: string;
  caption: string;
  username?: string;
  user_avatar?: string;
  like_count: number;
  is_liked: boolean;
  comments: Comment[];
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>(
    {}
  );
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
        const config = token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {};
        const res = await axios.get("http://localhost:8080/api/posts");
        setPosts(res.data);
      } catch (err) {
        console.error("データの取得に失敗しました", err);
      }
    };

    init();
  }, []);

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("user_id");
    localStorage.removeItem("avatar_url");
    setIsLoggedIn(false);
    setUsername("");
    alert("ログアウトしました");
    window.location.reload();
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
      // トークンを取得
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:8080/api/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      // 送信成功後のリセット処理
      setCaption("");
      setFile(null);
      setPreview("");

      // 投稿後にリストを再取得
      const res = await axios.get("http://localhost:8080/api/posts", {
        headers: { Authorization: "Bearer ${token" },
      });
      setPosts(res.data);

      alert("投稿しました！");
    } catch (err) {
      console.error("投稿エラー", err);
      alert("投稿に失敗しました");
    }
  };

  // いいね機能
  const handleLike = async (postId: number) => {
    if (!isLoggedIn) {
      alert("いいねするにはログインしてください");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      // APIを叩く (いいね/解除の切り替え)
      const res = await axios.post(
        `http://localhost:8080/api/posts/${postId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const isNowLiked = res.data.liked;

      // 画面上の数字とハートを即座に更新する
      setPosts(
        posts.map((post) => {
          if (post.ID === postId) {
            return {
              ...post,
              is_liked: isNowLiked,
              like_count: isNowLiked
                ? post.like_count + 1
                : post.like_count - 1,
            };
          }
          return post;
        })
      );
    } catch (err) {
      console.error("いいねエラー", err);
    }
  };

  // コメント送信処理
  const handleCommentSubmit = async (postId: number, e: FormEvent) => {
    e.preventDefault();
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    if (!isLoggedIn) {
      alert("コメントするにはログインしてください");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `http://localhost:8080/api/posts/${postId}/comments`,
        { text },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 新しいコメントを追加して画面更新
      const newComment = res.data;
      setPosts(
        posts.map((post) => {
          if (post.ID === postId) {
            return {
              ...post,
              comments: [...(post.comments || []), newComment],
            };
          }
          return post;
        })
      );
      // 入力欄を空にする
      setCommentInputs({ ...commentInputs, [postId]: "" });
    } catch (err) {
      console.error("コメント送信エラー", err);
      alert("コメントに失敗しました");
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

        {/* ログイン状態によるボタンの出し分け */}
        <div className="flex gap-4 text-sm font-bold">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="text-gray-500 hidden sm:block hover:text-blue-500 transition cursor-pointer"
              >
                こんにちは, {username}さん
              </Link>
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
                {/* ユーザーアバター表示 (追加) */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 border relative">
                  {post.user_avatar ? (
                    <Image
                      src={`http://localhost:8080${post.user_avatar}`}
                      alt={`${post.username}'s avatar`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
                <span className="font-bold text-sm text-black">
                  {post.username || "名無し"}
                </span>
              </div>

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
                  <button
                    onClick={() => handleLike(post.ID)}
                    className="flex items-center gap-1 hover:opacity-70 transition"
                  >
                    <span className="text-2xl">
                      {post.is_liked ? "❤️" : "♡"}
                    </span>
                  </button>
                  <button className="text-2xl">💬</button>
                </div>

                {/* いいね数表示 */}
                {post.like_count > 0 && (
                  <p className="font-bold text-sm text-gray-800 mb-1">
                    {post.like_count}件の「いいね！」
                  </p>
                )}

                <p className="text-sm text-black mb-2">
                  <span className="font-bold mr-2">
                    {post.username || "名無し"}
                  </span>
                  {post.caption}
                </p>

                {/* --- コメント表示エリア --- */}
                {post.comments && post.comments.length > 0 && (
                  <div className="mt-2 space-y-1 border-t pt-2">
                    {post.comments.map((comment) => (
                      <p key={comment.id} className="text-sm text-gray-700">
                        <span className="font-bold mr-2 text-black">
                          {comment.username}
                        </span>
                        {comment.text}
                      </p>
                    ))}
                  </div>
                )}

                {/* --- コメント入力フォーム --- */}
                {isLoggedIn && (
                  <form
                    onSubmit={(e) => handleCommentSubmit(post.ID, e)}
                    className="mt-3 flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="コメントを追加..."
                      className="flex-1 text-sm border-none outline-none text-gray-700"
                      value={commentInputs[post.ID] || ""}
                      onChange={(e) =>
                        setCommentInputs({
                          ...commentInputs,
                          [post.ID]: e.target.value,
                        })
                      }
                    />
                    <button
                      type="submit"
                      className="text-blue-500 font-bold text-sm disabled:opacity-50"
                      disabled={!commentInputs[post.ID]}
                    >
                      投稿
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
