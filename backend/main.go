package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// Post モデル（データベースのテーブル構造）
type Post struct {
	gorm.Model
	ImageURL string `json:"image_url"` // 画像の保存場所
	Caption  string `json:"caption"`   // 投稿本文
}

func main() {
	// 1. DB接続 (パスワード等は環境に合わせて変更してください)
	dsn := "root:@tcp(127.0.0.1:3306)/pazooblogs_db?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("データベースへの接続に失敗しました")
	}

	// 2. マイグレーション（postsテーブルを自動作成）
	db.AutoMigrate(&Post{})

	r := gin.Default()

	// 3. CORS設定（フロントエンドからのアクセス許可）
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 4. 画像保存用ディレクトリの作成と公開
	// uploadsフォルダがなければ作成
	if _, err := os.Stat("./uploads"); os.IsNotExist(err) {
		os.Mkdir("./uploads", 0755)
	}
	// http://localhost:8080/uploads/画像名.jpg でアクセスできるようにする
	r.Static("/uploads", "./uploads")

	// 5. APIルーティング
	// 投稿一覧取得 API
	r.GET("/api/posts", func(c *gin.Context) {
		var posts []Post
		// 作成日時の新しい順に取得
		db.Order("created_at desc").Find(&posts)
		c.JSON(http.StatusOK, posts)
	})

	// 新規投稿 API (画像アップロード含む)
	r.POST("/api/posts", func(c *gin.Context) {
		// フォームデータからキャプションを取得
		caption := c.PostForm("caption")

		// フォームデータから画像ファイルを取得
		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "画像が必要です"})
			return
		}

		// ファイル名をユニークにする（現在の時間を使うなど）
		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
		savePath := filepath.Join("./uploads", filename)

		// 画像をサーバーに保存
		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "画像の保存に失敗しました"})
			return
		}

		// データベースに情報を保存
		// 注意: フロントエンドからアクセスするためのURLパスを保存する
		post := Post{
			ImageURL: "/uploads/" + filename,
			Caption:  caption,
		}
		db.Create(&post)

		c.JSON(http.StatusOK, post)
	})

	// サーバー起動
	r.Run(":8080")
}
