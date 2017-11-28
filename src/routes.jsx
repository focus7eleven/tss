import React from 'react'
import Bundle from './components/route/Bundle'
import AppContainer from './containers/AppContainer'

const Loading = () => (<div>Loading...</div>)

const createComponent = component => props => (
  <Bundle load={component}>
    {
      Comp => (Comp ? <Comp {...props} /> : <Loading />)
    }
  </Bundle>
)

const routes = [{
  path: '/',
  component: AppContainer,
  routes: [{
    path: '/login',
    exact: true,
    component: createComponent(AppContainer)
  }, {
    path: '/index',
    exact: true,
    component: createComponent(AppContainer)
  }]
}]

export default routes
