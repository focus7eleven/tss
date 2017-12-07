import React from 'react'
import Bundle from './components/route/Bundle'
import AppContainer from './containers/AppContainer'
import AnnouncementEditor from 'bundle-loader?lazy!./components/editor/AnnouncementEditor'
import CanvasContainer from 'bundle-loader?lazy!./containers/test/CanvasContainer'
import TestContainer from 'bundle-loader?lazy!./containers/test/TestContainer'

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
    component: createComponent(AppContainer)
  }, {
    path: '/test',
    component: createComponent(TestContainer),
    routes: [{
      path: '/test/editor',
      component: createComponent(AnnouncementEditor)
    }, {
      path: '/test/canvas',
      component: createComponent(CanvasContainer)
    }]
  }]
}]

export default routes
