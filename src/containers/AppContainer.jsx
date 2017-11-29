import React from 'react'
import styles from './AppContainer.scss'
import Children from '../components/route/SubRoute'

class AppContainer extends React.Component {
	render() {
		return (
			<div className={styles.container}>
        <Children routes={this.props.routes}/>
			</div>
		)
	}
}

export default AppContainer
