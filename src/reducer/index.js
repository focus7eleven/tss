import {
	combineReducers
} from 'redux-immutable'
import user from './user'

const reducer = combineReducers({
	user,
})

export default reducer
