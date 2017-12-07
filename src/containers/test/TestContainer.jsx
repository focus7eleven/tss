import React from 'react'
import styles from './TestContainer.scss'
import Children from '../../components/route/SubRoute'

class TestContainer extends React.Component {
  render() {
    return (
      <div className={styles.container}>
        <Children routes={this.props.routes} />
      </div>
    )
  }
}

export default TestContainer
