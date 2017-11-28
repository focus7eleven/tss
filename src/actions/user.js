// import { actionNames } from 'action-utils'
import config from '../config'

export const LOGIN_SUCCESS = 'LOGIN_SUCCESS'
export const login = formData => dispatch => fetch(config.api.user.login, {
  method: 'POST',
  body: formData
}).then(res => res.json()).then((res) => {
  if (res.status === 1) {
    dispatch({
      type: LOGIN_SUCCESS,
    })
  }
})
