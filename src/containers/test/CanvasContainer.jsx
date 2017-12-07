import React from 'react'
import styles from './CanvasContainer.scss'

class CanvasContainer extends React.Component {

  componentDidMount = () => {
    const canvas = this.refs.canvas
    const ctx = canvas.getContext('2d')
    ctx.fillRect(25, 25, 100, 100)
    ctx.clearRect(45, 45, 1, 1)
    // ctx.strokeRect(50, 50, 50, 50)

    // ctx.beginPath();
    // ctx.moveTo(75, 50);
    // ctx.lineTo(100, 75);
    // ctx.lineTo(100, 25);
  }

  render = () => {
    return (
      <div className={styles.container}>
        <canvas className={styles.board} ref="canvas" width="800" height="800">
          Upgrade your browser to support advanced features
        </canvas>
      </div>
    )
  }
}

export default CanvasContainer
