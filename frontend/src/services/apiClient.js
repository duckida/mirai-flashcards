const BASE_URL = import.meta.env.VITE_API_URL || ''

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`
    const config = {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`)
    }

    return data
  }

  get(endpoint, options) {
    return this.request(endpoint, { method: 'GET', ...options })
  }

  post(endpoint, body, options) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options })
  }

  patch(endpoint, body, options) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options })
  }

  delete(endpoint, options) {
    return this.request(endpoint, { method: 'DELETE', ...options })
  }

  upload(endpoint, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE_URL}${endpoint}`)
      xhr.withCredentials = true

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(new Error(data.error || 'Upload failed'))
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(formData)
    })
  }
}

export const apiClient = new ApiClient()
