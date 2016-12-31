import React from 'react';
import ReactDOM from 'react-dom';
import Chart from 'chart.js';
import objectAssign from 'object-assign';

import Api from 'API/index';
import github from 'UTILS/github';
import chart from 'UTILS/chart';
import { GREEN_COLORS } from 'UTILS/colors';
import {
  sortRepos,
  getMaxIndex,
  getFirstTarget
} from 'UTILS/helper';
import {
  getDateBySeconds,
  getDateAfterDays
} from 'UTILS/date';
import { DAYS, LINECHART_CONFIG } from 'UTILS/const_value';
import ChartInfo from 'COMPONENTS/ChartInfo';

class Share extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      repos: [],
      commits: [],
      commitDatas: {
        dailyCommits: [],
        total: 0,
        commits: []
      },
      reposLanguages: [],
      languageDistributions: [],
      languageSkills: []
    };
    this.reposChart = null;
    this.languageSkillChart = null;
    this.commitsYearlyReviewChart = null;
  }

  componentDidMount() {
    const { login } = this.props;
    Api.github.getShareInfo(login).then((result) => {
      const { repos, commits } = result;
      this.setState({
        commits,
        loaded: true,
        repos: repos.sort(sortRepos()),
        commitDatas: github.combineReposCommits(commits),
        languageDistributions: github.getLanguageDistribution(repos),
        languageSkills: github.getLanguageSkill(repos),
        reposLanguages: [...github.getReposLanguages(repos)]
      });
    });
  }

  componentDidUpdate() {
    this.renderCharts();
  }

  renderCharts() {
    const { repos, commitDatas } = this.state;
    const { commits } = commitDatas;
    if (repos.length) {
      !this.reposChart && this.renderReposChart(repos.slice(0, 10));
      !this.languageSkillChart && this.renderLanguagesChart();
    }
    if (commits.length) {
      !this.commitsYearlyReviewChart && this.renderYearlyChart(commits);
    }
  }

  renderYearlyChart(commits) {
    const commitsChart = ReactDOM.findDOMNode(this.commitsYearlyChart);
    const commitDates = [];
    const dateLabels = [];
    commits.forEach((item) => {
      commitDates.push(item.total);
      dateLabels.push(getDateBySeconds(item.week));
    });
    this.commitsYearlyReviewChart = new Chart(commitsChart, {
      type: 'line',
      data: {
        labels: dateLabels,
        datasets: [objectAssign({}, LINECHART_CONFIG, {
          data: commitDates,
          label: '',
          pointHoverRadius: 2,
          pointHoverBorderWidth: 2,
          pointHitRadius: 2,
          pointBorderWidth: 0,
          pointRadius: 0,
        })]
      },
      options: {
        title: {
          display: false,
          text: ''
        },
        legend: {
          display: false,
        },
        scales: {
          xAxes: [{
            display: false,
            gridLines: {
              display: false
            }
          }],
          yAxes: [{
            display: false,
            gridLines: {
              display: false
            },
            ticks: {
              beginAtZero:true
            }
          }],
        },
        tooltips: {
          callbacks: {
            title: (item, data) => {
              return `${item[0].xLabel} ~ ${getDateAfterDays(7, item[0].xLabel)}`
            },
            label: (item, data) => {
              return `当周提交数：${item.yLabel}`
            }
          }
        }
      }
    })
  }

  renderLanguagesChart() {
    const { languageSkills } = this.state;
    const languages = Object.keys(languageSkills).filter(language => languageSkills[language] && language !== 'null');
    const skill = languages.map(language => languageSkills[language]);
    const languageSkill = ReactDOM.findDOMNode(this.languageSkill);
    this.languageSkillChart = new Chart(languageSkill, {
      type: 'radar',
      data: {
        labels: languages,
        datasets: [{
          data: skill,
          label: '',
          fill: true,
          backgroundColor: GREEN_COLORS[4],
          borderWidth: 2,
          borderColor: GREEN_COLORS[0],
          pointBackgroundColor: GREEN_COLORS[0],
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: GREEN_COLORS[0]
        }]
      },
      options: {
        title: {
          display: true,
          text: ''
        },
        legend: {
          display: false,
        },
        tooltips: {
          callbacks: {
            label: (item, data) => {
              return `收到 star 数：${item.yLabel}`
            }
          }
        }
      }
    });
  }

  renderReposChart(repos) {
    const { commits } = this.state;
    const reposReview = ReactDOM.findDOMNode(this.reposReview);
    this.reposChart = new Chart(reposReview, {
      type: 'bar',
      data: {
        labels: github.getReposNames(repos),
        datasets: [
          chart.getStarDatasets(repos),
          chart.getForkDatasets(repos),
          chart.getCommitDatasets(repos, commits)
        ]
      },
      options: {
        title: {
          display: false,
          text: ''
        },
        // legend: {
        //   display: false,
        // },
        scales: {
          xAxes: [{
            display: false,
            gridLines: {
              display:false
            }
          }],
          yAxes: [{
            display: false,
            gridLines: {
              display:false
            },
            ticks: {
              beginAtZero:true
            }
          }]
        },
      }
    });
  }

  renderCommitsInfo() {
    const { commitDatas } = this.state;
    const { commits, dailyCommits, total } = commitDatas;
    // day info
    const maxIndex = getMaxIndex(dailyCommits);
    const dayName = DAYS[maxIndex];
    // first commit
    const [firstCommitWeek, firstCommitIndex] = getFirstTarget(commits, (item) => item.total);
    const week = getDateBySeconds(firstCommitWeek.week);
    const [firstCommitDay, dayIndex] = getFirstTarget(firstCommitWeek.days, (day) => day > 0);
    const firstCommitDate = getDateAfterDays(dayIndex, week);
    return (
      <div>
        <div className="share_info">
          <ChartInfo
            style="share_chart_info"
            mainText={parseInt(total / 52, 10)}
            subText="平均每周提交次数"
          />
          <ChartInfo
            style="share_chart_info"
            mainText={firstCommitDate}
            subText="2016年第一次提交"
          />
        </div>
      </div>
    )
  }

  render() {
    const { repos, commits, loaded, languageSkills, languageDistributions } = this.state;
    const [totalStar, totalFork] = github.getTotalCount(repos);

    const maxStaredRepos = repos[0] ? repos[0].name : '';
    const yearlyRepos = github.getYearlyRepos(repos);
    const totalCommits = commits[0] ? commits[0].totalCommits : 0;

    const reposCount = Object.keys(languageDistributions).map(key => languageDistributions[key]);
    const starCount = Object.keys(languageSkills).map(key => languageSkills[key]);
    const maxReposCountIndex = getMaxIndex(reposCount);
    const maxStarCountIndex = getMaxIndex(starCount);

    return (
      <div>
        <div className="share_section">
          <div>
            <div className="share_info">
              <ChartInfo
                mainText={totalStar}
                subText="收获 star 数"
                style="share_chart_info"
              />
              <ChartInfo
                mainText={totalFork}
                subText="收获 fork 数"
                style="share_chart_info"
              />
              <ChartInfo
                mainText={yearlyRepos.length}
                subText="创建的仓库数"
                style="share_chart_info"
              />
            </div>
            {/* <div className="share_info">
              <ChartInfo
              icon="code"
              mainText={totalCommits}
              subText="单个仓库最多提交数"
              />
              <ChartInfo
              icon="cube"
              mainText={maxStaredRepos}
              subText="最受欢迎的仓库"
              />
            </div> */}
          </div>
          <div className="share_info_chart repos_chart">
            <canvas ref={ref => this.reposReview = ref}></canvas>
          </div>
        </div>

        <div className="share_section">
          <div>
            <div className="share_info">
              <ChartInfo
                style="share_chart_info"
                mainText={Object.keys(languageDistributions)[maxReposCountIndex]}
                subText="拥有最多的仓库"
              />
              <ChartInfo
                style="share_chart_info"
                mainText={Object.keys(languageSkills)[maxStarCountIndex]}
                subText="拥有最多的 star"
              />
            </div>
          </div>
          <div className="share_info_chart">
            <canvas ref={ref => this.languageSkill = ref}></canvas>
          </div>
        </div>

        <div className="share_section">
          { loaded ? this.renderCommitsInfo() : ''}
          <div className="share_info_chart">
            <canvas ref={ref => this.commitsYearlyChart = ref}></canvas>
          </div>
        </div>
      </div>
    )
  }
}

export default Share;