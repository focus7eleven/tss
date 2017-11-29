import React from 'react'
import styles from './TestContainer.scss'
import Children from '../../components/route/SubRoute'
import AnnouncementEditor from '../../components/editor/AnnouncementEditor'

class TestContainer extends React.Component {
  render() {
    return (
      <div className={styles.container}>
        <AnnouncementEditor />
        {/* <Children routes={this.props.routes} /> */}
      </div>
    )
  }
}

export default TestContainer
