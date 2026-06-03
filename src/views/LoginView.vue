<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { register as registerApi } from '@/api/user'

const router = useRouter()
const userStore = useUserStore()

const mode = ref('login') // 'login' | 'register'
const loading = ref(false)
const formRef = ref()

const form = reactive({
  username: '',
  password: '',
  nickname: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  await formRef.value.validate()
  loading.value = true
  try {
    if (mode.value === 'login') {
      await userStore.login({ username: form.username, password: form.password })
      ElMessage.success('登录成功')
      router.push('/home')
    } else {
      await registerApi({ username: form.username, password: form.password, nickname: form.nickname })
      ElMessage.success('注册成功，请登录')
      mode.value = 'login'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <el-card class="login-card">
      <h2 class="title">AWP 记账</h2>

      <el-radio-group v-model="mode" class="mode-switch">
        <el-radio-button label="login">登录</el-radio-button>
        <el-radio-button label="register">注册</el-radio-button>
      </el-radio-group>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item v-if="mode === 'register'" label="昵称（可选）">
          <el-input v-model="form.nickname" placeholder="不填则默认用用户名" />
        </el-form-item>
        <el-button type="primary" class="submit-btn" :loading="loading" @click="onSubmit">
          {{ mode === 'login' ? '登录' : '注册' }}
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-wrap {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-card {
  width: 360px;
}
.title {
  text-align: center;
  margin-bottom: 16px;
}
.mode-switch {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}
.submit-btn {
  width: 100%;
}
</style>
