import _ from 'lodash'

export const baseURL = "http://47.93.242.215:8928/manage"

const isProduction = process.env.NODE_ENV === "production"

const config = _.extend({
	// common config
	debug: !isProduction,
},{
	// dev config
	api:{
		user: {
			login: `${baseURL}/login`
		},
  }
})

export default config
