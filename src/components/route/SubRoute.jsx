import React from 'react'
import { Route } from 'react-router-dom'

const SubRoutes = route => (
  <Route exact={route.exact || false} path={route.path} render={props => (<route.component {...props} routes={route.routes} />)} />
)

const Children = ({routes}) => (
  routes.map(route => (
    <SubRoutes key={route.path} {...route} />
  ))
)

export default Children
