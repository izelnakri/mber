import Helper from '@ember/component/helper';

export let helper = Helper.helper(([leftSide, rightSide]) => {
  return leftSide === rightSide;
});
