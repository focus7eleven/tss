import { Map } from 'immutable'
// import _ from 'lodash'
import { LOGIN_SUCCESS } from '../actions/user'

const initialState = Map({
  isLogin: false
})

const user = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_SUCCESS:
      return state.set('isLogin', true)
    default:
      return state
  }
}

export default user
