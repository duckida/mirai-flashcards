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

    let response
    try {
      response = await fetch(url, config)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        throw new Error(`Cannot connect to server at ${BASE_URL}. Is the backend running?`)
      }
      throw new Error(`Network error: ${err.message}`)
    }

    let data
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      if (!response.ok) {
        throw new Error(`Server error (${response.status}): ${text.substring(0, 200)}`)
      }
      throw new Error(`Unexpected response from server (${response.status})`)
    }

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
