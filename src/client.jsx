import React from 'react'
import { Provider } from 'react-redux'
import { HashRouter as Router } from 'react-router-dom'
import Children from './components/route/SubRoute'
import createMyStore from './store'
import reducer from './reducer'
import routes from './routes'

const store = createMyStore(reducer)

export default class WrapperComponent extends React.Component {
  render() {
    return (
      <Provider store={store}>
        <Router>
          <Children routes={routes} />
        </Router>
      </Provider>
    )
  }
}
