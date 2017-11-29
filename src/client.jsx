import React from 'react'
import { Provider } from 'react-redux'
import { HashRouter as Router } from 'react-router-dom'
import Children from './components/route/SubRoute'
import routes from './routes'
import 'common.scss'

export default class WrapperComponent extends React.Component {
  render() {
    const store = this.props.store
    return (
      <Provider store={store}>
        <Router>
          <Children routes={routes} />
        </Router>
      </Provider>
    )
  }
}
