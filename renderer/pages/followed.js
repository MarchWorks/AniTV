import { Component } from 'react';
import Layout from '../components/layout';
import CadreEpisodes from '../components/cadre-episodes';
import Video from '../components/video';

export default class Followed extends Component {
  constructor(props) {
    super(props);
    this.ipcRenderer = global.ipcRenderer;
    this.state = {
      animesTV: [],
      selectedAnime: false,
      torrent: {}
    };

    this.showEpisodes = this.showEpisodes.bind(this);
    this.torrentState = this.torrentState.bind(this);
    this.reload = this.reload.bind(this);
    this.setAsWatched = this.setAsWatched.bind(this);
  }

  async componentDidMount() {
    const animesTV = await this.ipcRenderer.invoke('get-followedAni');
    const torrent = await this.ipcRenderer.invoke('get-downloadedEpi');
    this.setState({ animesTV, torrent });
    this.ipcRenderer.on('torrent-progress', this.torrentState);
  }

  componentWillUnmount() {
    this.ipcRenderer.removeListener('torrent-progress', this.torrentState);
  }

  async torrentState(event, arg) {
    let followedAnime = null;
    if (arg.progress === 1) {
      followedAnime = (await this.ipcRenderer.invoke('get-aniList')).filter(
        val =>
          val.mal_id ===
          (this.state.followedAnime ? this.state.followedAnime.mal_id : null)
      )[0];
    }

    this.setState(async prev => {
      const { torrent } = prev;
      torrent[arg.key] = arg;
      if (arg.progress === 1) {
        return {
          followedAnime,
          torrent
        };
      }

      return {
        torrent
      };
    });
  }

  async showEpisodes(anime) {
    const selectedAnime = anime
      ? (await this.ipcRenderer.invoke('get-aniList')).filter(
          val => val.mal_id === anime.mal_id
        )[0]
      : false;
    this.setState({ selectedAnime });
  }

  reload(anime) {
    this.ipcRenderer.send('reload-episodes', anime);
  }

  setAsWatched(anime) {
    this.ipcRenderer.send('move-to-watched', anime);
  }

  render() {
    return (
      <Layout>
        <div>
          {this.state.selectedAnime ? (
            <div className="episodes">
              <div
                role="button"
                className="exit"
                onClick={() => {
                  this.showEpisodes(false);
                }}
              />
              <div className="grid">
                {this.state.selectedAnime.episodes.map(ep => {
                  return (
                    <Video
                      key={ep.magnet + ep.number}
                      anime={this.state.selectedAnime}
                      ep={ep}
                      torrent={this.state.torrent}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid">
              {this.state.animesTV.map(val => {
                return (
                  <CadreEpisodes
                    showEpisodes={this.showEpisodes}
                    reload={this.reload}
                    setAsWatched={this.setAsWatched}
                    anime={val}
                    key={val.mal_id}
                  />
                );
              })}
            </div>
          )}
          <style jsx>{`
            .grid {
              display: flex;
              flex-wrap: wrap;
              justify-content: space-around;
              position: relative;
            }
            .episodes {
              position: relative;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              padding: 0 50px;
              box-sizing: border-box;
            }
            .exit {
              width: 50px;
              height: 50px;
              position: fixed;
              top: 20px;
              left: 20px;
              cursor: pointer;
            }
            .exit:before,
            .exit:after {
              content: '';
              width: 40px;
              height: 2px;
              background-color: #fff;
              position: absolute;
              top: calc(25px - 1px);
              left: 5px;
              transform-origin: center;
            }
            .exit:before {
              transform: rotateZ(45deg);
            }
            .exit:after {
              transform: rotateZ(-45deg);
            }
          `}</style>
        </div>
      </Layout>
    );
  }
}
