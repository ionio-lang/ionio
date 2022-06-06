import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

type FeatureItem = {
  title: string;
  image: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Scalable',
    image: '/img/feature-01.png',
    description: (
      <>
        Smart contract on Elements blockchains are designed to be scalable and powerful thanks to introspection and UTXO model.
      </>
    ),
  },
  {
    title: 'Easy to use',
    image: '/img/feature-02.png',
    description: (
      <>
        Ionio lets you focus on your contract logic, and it&apos;ll do the chores. Go
        ahead write your first smart contract in minutes, not months.
      </>
    ),
  },
  {
    title: 'Powered by Simplicity',
    image: '/img/feature-03.png',
    description: (
      <>
        Ionio is powered by Simplicity, a functional language without loops and recursion, designed to write Bitcoin Smart Contracts in a structured way. 
      </>
    ),
  },
];

function Feature({title, image, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img className={styles.featureSvg} alt={title} src={image} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
