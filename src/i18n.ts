// src/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n
  .use(initReactI18next)
  .init({
    lng: "zh",
    fallbackLng: "zh",
    resources: {
      zh: {
        translation: {
          pages: {
            login: {
              title: "登录您的账户",
              signin: "登录",
              signup: "注册",
              divider: "或",
              fields: {
                email: "邮箱",
                password: "密码"
              },
              errors: {
                validEmail: "错误的邮箱地址",
                requiredEmail: "请输入邮箱",
                requiredPassword: "请输入密码"
              },
              buttons: {
                submit: "登录",
                forgotPassword: "忘记密码?",
                noAccount: "没有账号?",
                rememberMe: "记住我"
              }
            },
            error: {
              "404": '页面不存在',
              backHome: '回到主页'
            }
          },
          "actions": {
            "list": "List",
            "create": "Create",
            "edit": "Edit",
            "show": "Show"
          },
          buttons: {
            "create": "Create",
            "save": "Save",
            logout: "退出登录",
            "delete": "Delete",
            "edit": "Edit",
            "cancel": "Cancel",
            "confirm": "Are you sure?",
            "filter": "Filter",
            "clear": "Clear",
            "refresh": "Refresh",
            "show": "Show",
            "undo": "Undo",
            "import": "Import",
            "clone": "Clone",
            "notAccessTitle": "You don't have permission to access"
          },


          "warnWhenUnsavedChanges": "Are you sure you want to leave? You have unsaved changes.",
          notifications: {
            success: "成功",
            error: "失败 (status code: {{statusCode}})",
            undoable: "你还有 {{seconds}} 秒可以撤销操作",
            createSuccess: "成功添加 {{resource}}",
            createError: "创建 {{resource}} 错误 (status code: {{statusCode}})",
            deleteSuccess: "成功删除 {{resource}}",
            deleteError: "删除 {{resource}} 错误 (status code: {{statusCode}})",
            editSuccess: "成功修改 {{resource}}",
            editError: "编辑 {{resource}} 错误 (status code: {{statusCode}})",
            importProgress: "导入: {{processed}}/{{total}}"
          },
          loading: "加载中",
          "tags": {
            "clone": "Clone"
          },
          "dashboard": {
            "title": "Dashboard"
          },
          "posts": {
            "posts": "Posts",
            "fields": {
              "id": "Id",
              "title": "Title",
              "category": "Category",
              "status": {
                "title": "Status",
                "published": "Published",
                "draft": "Draft",
                "rejected": "Rejected"
              },
              "content": "Content",
              "createdAt": "Created At"
            },
            "titles": {
              "create": "Create Post",
              "edit": "Edit Post",
              "list": "Posts",
              "show": "Show Post"
            }
          },
          table: {
            actions: "操作"
          },
          "documentTitle": {
            "default": "refine",
            "suffix": " | Refine",
            "post": {
              "list": "Posts | Refine",
              "show": "#{{id}} Show Post | Refine",
              "edit": "#{{id}} Edit Post | Refine",
              "create": "Create new Post | Refine",
              "clone": "#{{id}} Clone Post | Refine"
            }
          },
          "autoSave": {
            "success": "saved",
            "error": "auto save failure",
            "loading": "saving...",
            "idle": "waiting for changes"
          }
        },
      },
    },
  });

export default i18n;