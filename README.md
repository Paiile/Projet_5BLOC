# TCG Game Project

## Explications

Notre projet s'inspire du jeu Pokémon TCG. 

Nous déployons des contrats sur une blockchain dans laquelle nous pouvons acheter des boosters contenant 3 cartes en échange de 100 tokens. 

Chaque utilisateur peut posséder un maximum de 15 cartes. Pour gérer leur stock ils ont 2 options à leur disposition. 

- **Brûler des cartes** : En fonction de leur valeur, déterminée par le nom, le type et la rareté, les utilisateurs reçoivent un certain nombre de token. 

- **Transférer des cartes** : Au lieu de les brûler, les utilisateur peuvent également donner une carte à un autre joueur.

- **Echange de carte** : Les utilisateur peuvent s'échanger une carte.

- **Cooldown** : Un délai est imposé entre l’ouverture des boosters, l’échange de cartes, donner une carte et la destruction d’une carte. Les ouvertures de boosters et les transferts de cartes partagent le même temps de recharge, tandis que la destruction d’une carte a un délai distinct.

## Liste des commandes

Voici la liste des commandes à effectuer pour permettre de réaliser les tests de notre projet.

Tout d'abord réaliser la commande npm i pour installer toutes les dépendances du projet

```shell 
npm i 
```

Sur un premier terminal
```shell
npx hardhat node
```

Sur un deuxième terminal 
```shell
ipfs daemon
```

Sur un deuxieme terminal
```shell 
npx hardhat compile
npx hardhat ignition deploy .\ignition\modules\TCGGame.js --network localhost
npx hardhat test
```