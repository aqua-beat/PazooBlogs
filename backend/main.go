package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// テスト用のデータ構造
type TestPost struct {
	gorm.Model
	Title string
}

func main() {
	// DB接続設定 (ユーザー名:パスワード@tcp(場所:ポート)/DB名...)
	dsn := "root:@tcp(127.0.0.1:3306)/pazooblogs_db?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("データベースへの接続に失敗しました")
	}

	// マイグレーション（テーブル自動作成）
	db.AutoMigrate(&TestPost{})

	// Ginの初期化
	r := gin.Default()

	// CORS設定（Next.jsからのアクセスを許可）
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // フロントエンドのURL
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// ルーティング
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Go Backend is working!"})
	})

	// サーバー起動 (ポート8080)
	fmt.Println("Server running on http://localhost:8080")
	r.Run(":8080")
}
