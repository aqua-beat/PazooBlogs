package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// User モデル (ユーザー情報)
type User struct {
	gorm.Model
	Username string `json:"username" gorm:"unique"` // 重複禁止
	Password string `json:"password"`
}

// Post モデル
type Post struct {
	gorm.Model
	ImageURL string `json:"image_url"`
	Caption  string `json:"caption"`
}

func main() {
	// DB接続
	dsn := "root:@tcp(127.0.0.1:3306)/pazooblogs_db?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("データベースへの接続に失敗しました")
	}

	// マイグレーション（UserテーブルとPostテーブルを作成）
	db.AutoMigrate(&User{}, &Post{})

	r := gin.Default()

	// CORS設定
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 画像ディレクトリ設定
	if _, err := os.Stat("./uploads"); os.IsNotExist(err) {
		os.Mkdir("./uploads", 0755)
	}
	r.Static("/uploads", "./uploads")

	// --- API ルーティング ---

	// 1. ユーザー登録 API
	r.POST("/api/signup", func(c *gin.Context) {
		var user User
		// フロントから送られてきたJSON (username, password) を読み込む
		if err := c.ShouldBindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "データ形式が正しくありません"})
			return
		}

		// パスワードを暗号化 (ハッシュ化)
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "パスワードの暗号化に失敗しました"})
			return
		}
		user.Password = string(hashedPassword)

		// DBに保存
		result := db.Create(&user)
		if result.Error != nil {
			// 重複エラーなどの場合
			c.JSON(http.StatusBadRequest, gin.H{"error": "このユーザー名は既に使用されています"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "ユーザー登録が完了しました"})
	})

	// 2. 投稿一覧 API
	r.GET("/api/posts", func(c *gin.Context) {
		var posts []Post
		db.Order("created_at desc").Find(&posts)
		c.JSON(http.StatusOK, posts)
	})

	// 3. 新規投稿 API
	r.POST("/api/posts", func(c *gin.Context) {
		caption := c.PostForm("caption")
		file, err := c.FormFile("image")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "画像が必要です"})
			return
		}

		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
		savePath := filepath.Join("./uploads", filename)

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "画像の保存に失敗しました"})
			return
		}

		post := Post{
			ImageURL: "/uploads/" + filename,
			Caption:  caption,
		}
		db.Create(&post)

		c.JSON(http.StatusOK, post)
	})

	r.Run(":8080")
}
