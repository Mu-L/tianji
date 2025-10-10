import React from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import LogoSvg from '@site/static/img/logo.svg';
import { Carousel } from 'react-responsive-carousel';
import { Popover } from 'antd';
import { RiDiscordFill, RiTwitterXFill, RiWechatFill } from 'react-icons/ri';
import { BlockCard } from '../components/BlockCard';
import { HomepageHeaderLight } from '../components/homepage/HeaderLight';
import { HomepageFeatures } from '../components/homepage/Features';
import { HomepageSimpleLight } from '../components/homepage/SimpleLight';
import ShineBorder from '@/components/ui/shine-border';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { ClientTweetCard } from '../components/ui/client-tweet-card';

import 'react-responsive-carousel/lib/styles/carousel.min.css';
import './index.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className="container relative">
      <div className="mt-10 text-center">
        <LogoSvg className="h-40 w-40" />
        <h1 className="text-5xl">
          <span className="text-gradient font-bold">Tianji</span>
        </h1>
        <p className="text-2xl opacity-60">All-in-One Insight Hub</p>
        <div className="text-xl">
          <span className="text-gradient font-bold">Tianji</span> ={' '}
          <span className="font-semibold underline">Website Analytics</span> +{' '}
          <span className="font-semibold underline">Uptime Monitor</span> +{' '}
          <span className="font-semibold underline">Server Status</span> +{' '}
          <span className="font-semibold underline">More...</span>
        </div>
      </div>

      <div className="mb-4 mt-8 flex justify-center">
        <div className="flex flex-col gap-2">
          <Link
            // to="/docs/intro"
            to="https://app-tianji.msgbyte.com/"
            // className="cursor-pointer rounded-full bg-blue-500 px-8 py-3 text-lg font-bold text-white hover:bg-blue-800 hover:text-white hover:no-underline"
            data-tianji-event="homepage-getstart"
          >
            <InteractiveHoverButton
              text="Get Start in Cloud"
              className="text-md h-10 w-60"
            />
          </Link>

          {/* <Link
            to={'https://github.com/msgbyte/tianji'}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-zinc-800 px-8 py-3 text-lg font-bold text-white hover:bg-zinc-600 hover:text-white hover:no-underline"
            data-tianji-event="homepage-star"
          >
            <LuGithub />
            <span>Deploy in Local</span>
          </Link> */}
        </div>
      </div>

      <div className="text-center font-bold">Or</div>

      <div className="my-3 mt-2 text-center">
        <div className="mb-2 text-center text-sm opacity-60">
          Deploy by your self with Docker Compose
        </div>
        {/* <Link
          className="button button--primary button--lg"
          to="mailto:moonrailgun@gmail.com?subject=I want to apply for Tianji early access account&body=Here is my account: <Here place your username>"
        >
          Early Access
        </Link> */}
        {/* <Link
          className="button button--primary button--lg"
          to="https://demo.tianji.msgbyte.com"
        >
          Visit Demo
        </Link> */}

        <div
          className="m-auto w-min max-w-full overflow-auto rounded-lg bg-neutral-100 text-left dark:bg-neutral-800"
          style={{ boxShadow: '0px 0px 100px 0px rgba(0, 119, 230, 0.40)' }}
        >
          <ShineBorder
            className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border p-2 md:shadow-xl"
            color={['#A07CFE', '#FE8FB5', '#FFBE7B']}
          >
            <div>
              <div className="whitespace-nowrap">
                <span className="mr-1 select-none opacity-50">$</span>wget
                https://raw.githubusercontent.com/msgbyte/tianji/master/docker-compose.yml
              </div>
              <div>
                <span className="mr-1 select-none opacity-50">$</span>docker
                compose up -d
              </div>
            </div>
          </ShineBorder>
        </div>

        <small className="opacity-50">
          Default account is <b>admin</b>/<b>admin</b>, please change password
          ASAP.
        </small>
      </div>
    </header>
  );
}

function HomepageMain() {
  return (
    <main className="container overflow-hidden pb-8">
      {/* <div className="mb-8 mt-4 flex flex-wrap justify-around gap-2">
        <div className="checked-item rounded border border-solid border-gray-300 px-4 py-2">
          ✔ No cookies
        </div>
        <div className="checked-item rounded border border-solid border-gray-300 px-4 py-2">
          ✔ International support
        </div>
        <div className="checked-item rounded border border-solid border-gray-300 px-4 py-2">
          ✔ GDPR & CCPA compliant
        </div>
        <div className="checked-item rounded border border-solid border-gray-300 px-4 py-2">
          ✔ Open API
        </div>
        <div className="checked-item rounded border border-solid border-gray-300 px-4 py-2">
          ✔ Open Source
        </div>
      </div> */}

      {/* Features */}
      <div className="relative mb-32 mt-32">
        <HomepageFeatures />

        <HomepageSimpleLight
          className="right-[-600px] top-[-50px]"
          colorSet="blue"
        />
      </div>

      <div className="mb-16 text-center text-5xl font-bold text-white">
        Preview
      </div>

      <div className="relative text-center">
        <div className="rounded-lg border-8 border-solid border-gray-200 shadow-lg dark:border-zinc-800">
          <Carousel
            className="cursor-move overflow-hidden rounded-lg"
            showThumbs={false}
            showStatus={false}
            showIndicators={true}
            autoPlay={true}
            swipeable={true}
            interval={5000}
            stopOnHover={true}
            emulateTouch={true}
            infiniteLoop={true}
          >
            <img className="select-none" src="/img/preview/1.png" />
            <img className="select-none" src="/img/preview/2.png" />
            <img className="select-none" src="/img/preview/3.png" />
            <img className="select-none" src="/img/preview/4.png" />
            <img className="select-none" src="/img/preview/5.png" />
            <img className="select-none" src="/img/preview/6.png" />
          </Carousel>
        </div>

        <HomepageSimpleLight
          className="left-[-600px] top-[-160px]"
          colorSet="cyan"
        />
      </div>
    </main>
  );
}

function HomepageFooter() {
  return (
    <div className="relative py-8 text-center">
      <div id="join-community" className="mb-8 text-4xl font-bold">
        Join Our Community
      </div>

      <div className="flex justify-center gap-4">
        <Popover
          content={<img width={300} src="/img/wechat.jpg" />}
          trigger={'click'}
        >
          <BlockCard
            icon={<RiWechatFill className="text-green-500" />}
            title="Wechat"
            data-tianji-event="community-wechat"
          />
        </Popover>

        <BlockCard
          icon={<RiDiscordFill className="text-indigo-600" />}
          title="Discord"
          data-tianji-event="community-discord"
          onClick={() => window.open('https://discord.gg/8Vv47wAEej')}
        />

        <BlockCard
          icon={<RiTwitterXFill />}
          title="Twitter"
          data-tianji-event="community-twitter"
          onClick={() => window.open('https://twitter.com/moonrailgun')}
        />
      </div>

      <div className="mt-4 opacity-80">
        <a
          href="https://turbo0.com/item/tianji"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://img.turbo0.com/badge-listed-dark.svg"
            alt="Listed on Turbo0"
            style={{ height: 54, width: 'auto' }}
          />
        </a>
      </div>

      <div className="mb-8 mt-12 text-4xl font-bold">
        And connect with Tianji's real user from all over the world
      </div>

      <div className="testimonial-grid mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <ClientTweetCard id="1876982441312751667" className="tweet-card" />
        <ClientTweetCard id="1788136586380771781" className="tweet-card" />
        <ClientTweetCard id="1877547135442329726" className="tweet-card" />
        <ClientTweetCard id="1876346601326649665" className="tweet-card" />
        <ClientTweetCard id="1877744903255462173" className="tweet-card" />
        <ClientTweetCard id="1844763816619294808" className="tweet-card" />
        <ClientTweetCard id="1842367065375617205" className="tweet-card" />
        <ClientTweetCard id="1843381313933656116" className="tweet-card" />
        <ClientTweetCard id="1743323947377041806" className="tweet-card" />
        <ClientTweetCard id="1852357169175318932" className="tweet-card" />
      </div>
    </div>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Tianji = Website Analytics + Uptime Monitor + Server Status`}
      description={siteConfig.tagline}
    >
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'Tianji',
                url: 'https://tianji.dev',
                logo: 'https://tianji.dev/img/logo.svg',
                sameAs: [
                  'https://github.com/msgbyte/tianji',
                  'https://twitter.com/moonrailgun',
                  'https://discord.gg/8Vv47wAEej',
                ],
              },
              {
                '@type': 'SoftwareApplication',
                name: 'Tianji',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Any',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                url: 'https://tianji.dev',
              },
            ],
          })}
        </script>
      </Head>
      <div className="relative z-0 bg-black">
        <HomepageHeaderLight />

        <HomepageHeader />

        <HomepageMain />

        <HomepageFooter />
      </div>
    </Layout>
  );
}
